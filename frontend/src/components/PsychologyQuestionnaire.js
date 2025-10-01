import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import apiClient from '../utils/api';

const PsychologyQuestionnaire = ({ onLogout }) => {
  const [currentCategory, setCurrentCategory] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [questionsData, setQuestionsData] = useState({
    HowGard: [],
    Attitude: [],
    Motivational: []
  });
  const [progressData, setProgressData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCategorySelection, setShowCategorySelection] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const categories = [
    {
      name: "Multiple Intelligences Test",
      subtitle: "based on Howard Gardner's MI Model",
      description: "Discover your unique intelligence profile across 8 different types of intelligence. This assessment will help identify your cognitive strengths and preferred learning styles.",
      key: "HowGard",
      instructions: [
        "Rate all the questions below with a score of 1-4.",
        "Score the statements:",
        "1 - Mostly Disagree",
        "2 - Slightly Disagree", 
        "3 - Slightly Agree",
        "4 - Mostly Agree"
      ],
      options: ["1", "2", "3", "4"],
      optionLabels: ["1 Mostly Disagree", "2 Slightly Disagree", "3 Slightly Agree", "4 Mostly Agree"]
    },
    {
      name: "Attitude Styles Checklist",
      subtitle: "",
      description: "Understand your behavioral patterns and attitude tendencies. This assessment reveals how you approach situations and interact with the world around you.",
      key: "Attitude",
      instructions: [
        "Score the statements:",
        "1 - Mostly Disagree",
        "2 - Slightly Disagree",
        "3 - Slightly Agree", 
        "4 - Mostly Agree"
      ],
      options: ["1", "2", "3", "4"],
      optionLabels: ["1 Mostly Disagree", "2 Slightly Disagree", "3 Slightly Agree", "4 Mostly Agree"]
    },
    {
      name: "Your Motivational Profile",
      subtitle: "",
      description: "Explore what drives and motivates you in work and life. This assessment helps identify your key motivational factors and work preferences.",
      key: "Motivational",
      instructions: [
        "For each of the following statements, circle the number that most closely agrees with how you feel.",
        "Consider your answers in the context of your current job or past work experience.",
        "",
        "SD - Strongly Disagree",
        "D - Disagree", 
        "M - Moderate",
        "A - Agree",
        "SA - Strongly Agree"
      ],
      options: ["1", "2", "3", "4", "5"],
      optionLabels: ["Strongly Disagree", "Disagree", "Moderate", "Agree", "Strongly Agree"]
    }
  ];

  const saveProgressToDatabase = useCallback(async (categoryIndex, currentAnswers) => {
    if (categoryIndex === null || isSaving) return;
    
    try {
      setIsSaving(true);
      const currentCategoryData = categories[categoryIndex];
      const categoryAnswers = {};
      
      Object.keys(currentAnswers).forEach(key => {
        if (key.startsWith(`${categoryIndex}-`)) {
          const questionIndex = key.split('-')[1];
          categoryAnswers[questionIndex] = currentAnswers[key];
        }
      });

      await apiClient.saveProgress({
        form_name: currentCategoryData.key,
        current_progress: Object.keys(categoryAnswers).length,
        responses: categoryAnswers
      });

      console.log('Progress saved successfully');
    } catch (err) {
      console.error('Error saving progress:', err);
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, categories]);

  useEffect(() => {
    if (currentCategory !== null && Object.keys(answers).length > 0) {
      const timeoutId = setTimeout(() => {
        saveProgressToDatabase(currentCategory, answers);
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [answers, currentCategory, saveProgressToDatabase]);

  useEffect(() => {
    const loadQuestionsFromDatabase = async (formType) => {
      try {
        console.log(`Loading questions for: ${formType}`);
        const result = await apiClient.getQuestions(formType);
        
        console.log(`API Response for ${formType}:`, result);
        
        if (result.success) {
          const formKeyMap = {
            'howgard': 'HowGard',
            'attitude': 'Attitude',
            'motivational': 'Motivational'
          };
          
          const formKey = formKeyMap[formType];
          console.log(`Setting ${result.questions.length} questions for ${formKey}`);
          
          setQuestionsData(prev => ({
            ...prev,
            [formKey]: result.questions
          }));
          
          return result.questions;
        } else {
          console.error(`Failed to load ${formType} questions:`, result);
          throw new Error(`Failed to load questions: ${result.error || 'Unknown error'}`);
        }
      } catch (err) {
        console.error(`Error loading ${formType} questions:`, err);
        throw err;
      }
    };

    const loadSavedResponses = async () => {
      try {
        const allResponses = {};
        
        for (let i = 0; i < categories.length; i++) {
          const category = categories[i];
          try {
            const result = await apiClient.getSavedResponses(category.key);
            if (result.success && result.responses) {
              Object.keys(result.responses).forEach(questionIndex => {
                const answerKey = `${i}-${questionIndex}`;
                allResponses[answerKey] = result.responses[questionIndex];
              });
            }
          } catch (err) {
            console.log(`No saved responses for ${category.key}`);
          }
        }
        
        console.log('Loaded saved responses:', allResponses);
        setAnswers(allResponses);
      } catch (err) {
        console.error('Error loading saved responses:', err);
      }
    };

    const loadProgressData = async () => {
      try {
        const result = await apiClient.getProgress();
        if (result.success) {
          setProgressData(result.progress);
        }
      } catch (err) {
        console.error('Error loading progress:', err);
      }
    };

    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log('Starting to load questions...');
        
        const results = await Promise.all([
          loadQuestionsFromDatabase('howgard'),
          loadQuestionsFromDatabase('attitude'),
          loadQuestionsFromDatabase('motivational')
        ]);
        
        console.log('All questions loaded:', {
          howgard: results[0]?.length || 0,
          attitude: results[1]?.length || 0,
          motivational: results[2]?.length || 0
        });

        await loadProgressData();
        await loadSavedResponses();
        
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading initial data:', err);
        setError(err.message || 'Failed to load assessment data');
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  const handleCategorySelection = async (categoryIndex) => {
    if (currentCategory !== null) {
      await saveProgressToDatabase(currentCategory, answers);
    }
    
    setCurrentCategory(categoryIndex);
    
    const categoryQuestions = questionsData[categories[categoryIndex].key] || [];
    let startQuestion = 0;
    
    for (let i = 0; i < categoryQuestions.length; i++) {
      const answerKey = `${categoryIndex}-${i}`;
      if (!answers[answerKey]) {
        startQuestion = i;
        break;
      }
    }
    
    setCurrentQuestion(startQuestion);
    setShowCategorySelection(false);
  };

  const backToCategorySelection = async () => {
    if (currentCategory !== null) {
      await saveProgressToDatabase(currentCategory, answers);
    }
    
    setShowCategorySelection(true);
    setCurrentCategory(null);
    setCurrentQuestion(0);
  };

  const handleLogout = async () => {
    try {
      if (currentCategory !== null) {
        await saveProgressToDatabase(currentCategory, answers);
      }
      
      await apiClient.logout();
      onLogout();
    } catch (err) {
      console.error('Logout error:', err);
      onLogout();
    }
  };

  const currentCategoryData = currentCategory !== null ? categories[currentCategory] : null;
  const currentQuestions = currentCategoryData ? (questionsData[currentCategoryData.key] || []) : [];
  const totalQuestions = currentQuestions.length;
  const totalAnsweredInCategory = currentCategory !== null ? Object.keys(answers).filter(key => 
    key.startsWith(`${currentCategory}-`)
  ).length : 0;
  
  const totalAnsweredOverall = Object.keys(answers).length;
  const totalQuestionsOverall = categories.reduce((sum, cat) => 
    sum + (questionsData[cat.key]?.length || 0), 0
  );

  const handleAnswerChange = (value) => {
    const answerKey = `${currentCategory}-${currentQuestion}`;
    setAnswers(prev => ({
      ...prev,
      [answerKey]: value
    }));
  };

  const getCurrentAnswer = () => {
    const answerKey = `${currentCategory}-${currentQuestion}`;
    return answers[answerKey] || '';
  };

  const goToNextQuestion = () => {
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      submitCurrentForm();
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const skipQuestion = () => {
    goToNextQuestion();
  };

  const submitAnswer = () => {
    if (getCurrentAnswer()) {
      goToNextQuestion();
    }
  };

  const submitCurrentForm = async () => {
    try {
      const currentCategoryData = categories[currentCategory];
      const categoryAnswers = {};
      
      Object.keys(answers).forEach(key => {
        if (key.startsWith(`${currentCategory}-`)) {
          const questionIndex = key.split('-')[1];
          const questionData = currentQuestions[parseInt(questionIndex)];
          if (questionData) {
            categoryAnswers[questionData.id] = {
              question: questionData.question,
              score: parseInt(answers[key])
            };
          }
        }
      });

      await apiClient.submitForm({
        form_name: currentCategoryData.key,
        responses: categoryAnswers
      });

      alert(`${currentCategoryData.name} completed successfully!`);
      backToCategorySelection();
    } catch (err) {
      console.error('Error submitting form:', err);
      alert('Error submitting form. Please try again.');
    }
  };

  const getProgressPercentage = () => {
    return totalQuestionsOverall > 0 ? (totalAnsweredOverall / totalQuestionsOverall) * 100 : 0;
  };

  const getCategoryProgressPercentage = () => {
    return totalQuestions > 0 ? (totalAnsweredInCategory / totalQuestions) * 100 : 0;
  };

  const getCategoryStatus = (categoryKey) => {
    return progressData[categoryKey]?.status || 'not_started';
  };

  const getCategoryProgress = (categoryKey) => {
    return progressData[categoryKey]?.current_progress || 0;
  };

  const findNextCategory = () => {
    for (let i = 0; i < categories.length; i++) {
      const status = getCategoryStatus(categories[i].key);
      const totalQuestions = questionsData[categories[i].key]?.length || 0;
      const answeredCount = Object.keys(answers).filter(key => 
        key.startsWith(`${i}-`)
      ).length;
      
      if (status !== 'submitted' && answeredCount < totalQuestions) {
        return i;
      }
    }
    return 0;
  };

  const handleStartAssessment = () => {
    const nextCategoryIndex = findNextCategory();
    handleCategorySelection(nextCategoryIndex);
  };

  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingText}>Loading assessment data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.errorContainer}>
          <div style={styles.errorTitle}>Error Loading Data</div>
          <div style={styles.errorMessage}>{error}</div>
          <button 
            onClick={() => window.location.reload()}
            style={styles.retryButton}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (showCategorySelection) {
    const hasAnyProgress = totalAnsweredOverall > 0;
    const allCompleted = categories.every(cat => getCategoryStatus(cat.key) === 'submitted');
    
    return (
      <div style={styles.container}>
        <div style={styles.categorySelectionWrapper}>
          <div style={styles.categorySelectionCard}>
            <div style={styles.selectionHeader}>
              <div style={styles.headerRow}>
                <div>
                  <h1 style={styles.selectionTitle}>Psychology Assessment Platform</h1>
                  <p style={styles.selectionSubtitle}>Choose a category to begin your assessment</p>
                </div>
                <button onClick={handleLogout} style={styles.logoutButton}>
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </div>
            
            <div style={styles.categoriesGrid}>
              {categories.map((category, index) => {
                const status = getCategoryStatus(category.key);
                const totalQuestions = questionsData[category.key]?.length || 0;
                const answeredCount = Object.keys(answers).filter(key => 
                  key.startsWith(`${index}-`)
                ).length;
                
                return (
                  <div
                    key={index}
                    style={{
                      ...styles.categoryCard,
                      ...(status === 'submitted' ? styles.categoryCardCompleted : {}),
                      ...(answeredCount > 0 && status !== 'submitted' ? styles.categoryCardInProgress : {})
                    }}
                    onClick={() => handleCategorySelection(index)}
                  >
                    <div style={styles.categoryCardHeader}>
                      <h3 style={styles.categoryCardTitle}>{category.name}</h3>
                      {category.subtitle && (
                        <p style={styles.categoryCardSubtitle}>{category.subtitle}</p>
                      )}
                      <div style={styles.statusBadge}>
                        <span style={{
                          ...styles.statusText,
                          color: status === 'submitted' ? '#22C55E' : 
                                answeredCount > 0 ? '#F59E0B' : '#6B7280'
                        }}>
                          {status === 'submitted' ? '✓ Completed' :
                           answeredCount > 0 ? `In Progress (${answeredCount}/${totalQuestions})` :
                           'Not Started'}
                        </span>
                      </div>
                    </div>
                    
                    <p style={styles.categoryCardDescription}>
                      {category.description}
                    </p>
                    
                    <div style={styles.categoryCardFooter}>
                      <span style={styles.questionCount}>
                        {totalQuestions} Questions
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div style={styles.totalQuestionsInfo}>
              <p style={styles.totalQuestionsText}>
                Total Progress: {totalAnsweredOverall} / {totalQuestionsOverall} Questions
              </p>
              {isSaving && (
                <p style={styles.savingIndicator}>Saving progress...</p>
              )}
              
              <button 
                onClick={handleStartAssessment}
                style={styles.centralStartButton}
              >
                {allCompleted ? 'Review Assessments' : 
                 hasAnyProgress ? 'Continue Assessment' : 'Start Assessment'}
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentCategoryData || totalQuestions === 0) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingText}>No questions available...</div>
      </div>
    );
  }

  const currentQuestionData = currentQuestions[currentQuestion];
  const questionNumber = currentQuestion + 1;

  return (
    <div style={styles.container}>
      <div style={styles.mainWrapper}>
        
        <div style={styles.sidebar}>
          <div style={styles.categoryInfo}>
            <h1 style={styles.categoryTitle}>
              {currentCategoryData.name}
            </h1>
            {currentCategoryData.subtitle && (
              <p style={styles.categorySubtitle}>
                {currentCategoryData.subtitle}
              </p>
            )}
            
            <div style={styles.instructionsContainer}>
              {currentCategoryData.instructions.map((instruction, idx) => (
                <p key={idx} style={{
                  ...styles.instructionText,
                  ...(instruction.includes(':') || instruction.includes('-') ? styles.instructionBold : {})
                }}>
                  {instruction}
                </p>
              ))}
            </div>
          </div>

          <div style={styles.progressSection}>
            <h3 style={styles.progressTitle}>Progress Overview</h3>
            
            <div style={styles.progressItem}>
              <div style={styles.progressHeader}>
                <span>Overall Progress</span>
                <span>{totalAnsweredOverall}/{totalQuestionsOverall}</span>
              </div>
              <div style={styles.progressBarBg}>
                <div 
                  style={{
                    ...styles.progressBar,
                    width: `${getProgressPercentage()}%`,
                    backgroundColor: '#ffffff'
                  }}
                ></div>
              </div>
            </div>

            <div style={styles.progressItem}>
              <div style={styles.progressHeader}>
                <span>Current Category</span>
                <span>{totalAnsweredInCategory}/{totalQuestions}</span>
              </div>
              <div style={styles.progressBarBg}>
                <div 
                  style={{
                    ...styles.progressBar,
                    width: `${getCategoryProgressPercentage()}%`,
                    backgroundColor: '#B3D29A'
                  }}
                ></div>
              </div>
            </div>

            <div style={styles.categoriesContainer}>
              <h4 style={styles.categoriesTitle}>Categories:</h4>
              {categories.map((cat, idx) => {
                const status = getCategoryStatus(cat.key);
                const answeredCount = Object.keys(answers).filter(key => 
                  key.startsWith(`${idx}-`)
                ).length;
                
                return (
                  <div key={idx} style={{
                    ...styles.categoryItem,
                    backgroundColor: idx === currentCategory ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.15)'
                  }}>
                    <div style={styles.categoryItemContent}>
                      <span>{cat.name}</span>
                      <span>
                        {answeredCount}/{questionsData[cat.key]?.length || 0}
                        {status === 'submitted' && <span style={styles.completedMark}> ✓</span>}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {isSaving && (
              <div style={styles.savingIndicator}>
                <span>Saving progress...</span>
              </div>
            )}
          </div>
        </div>

        <div style={styles.questionArea}>
          <div style={styles.questionCard}>
            <div style={styles.questionHeader}>
              <h2 style={styles.questionCounter}>
                Question {questionNumber}/{totalQuestions}
              </h2>
              <h3 style={styles.questionText}>
                {currentQuestionData.question}
              </h3>
              <p style={styles.selectInstruction}>Select Only 1</p>
            </div>

            <div style={styles.optionsGrid}>
              {currentCategoryData.options.map((option, idx) => (
                <div
                  key={option}
                  onClick={() => handleAnswerChange(option)}
                  style={styles.optionContainer}
                >
                  <div style={styles.checkboxContainer}>
                    <div style={{
                      ...styles.checkbox,
                      backgroundColor: getCurrentAnswer() === option ? '#60AA47' : 'transparent',
                      borderColor: getCurrentAnswer() === option ? '#60AA47' : '#d1d5db'
                    }}>
                      {getCurrentAnswer() === option && (
                        <div style={styles.checkmark}>✓</div>
                      )}
                    </div>
                    <span style={styles.optionText}>{currentCategoryData.optionLabels[idx]}</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={styles.navigationContainer}>
              <button
                onClick={currentQuestion === 0 ? backToCategorySelection : goToPreviousQuestion}
                style={{...styles.navButton, ...styles.prevButton}}
              >
                <ChevronLeft size={20} />
                {currentQuestion === 0 ? 'Back to Categories' : 'Previous'}
              </button>
              
              <div style={styles.actionButtons}>
                <button
                  onClick={skipQuestion}
                  style={{...styles.navButton, ...styles.skipButton}}
                >
                  Skip
                </button>
                <button
                  onClick={submitAnswer}
                  disabled={!getCurrentAnswer()}
                  style={{
                    ...styles.navButton,
                    ...styles.submitButton,
                    ...(getCurrentAnswer() ? {} : styles.navButtonDisabled)
                  }}
                >
                  {currentQuestion === totalQuestions - 1 ? 'Complete Category' : 'Submit'}
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #CCD8C2 0%, #B3D29A 30%, #60AA47 65%, #2E6603 100%)',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  categorySelectionWrapper: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 'calc(100vh - 40px)'
  },
  categorySelectionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '24px',
    padding: '48px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    width: '100%',
    maxWidth: '1000px',
    backdropFilter: 'blur(10px)'
  },
  selectionHeader: {
    marginBottom: '48px'
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  selectionTitle: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#2E6603',
    marginBottom: '16px',
    margin: '0 0 16px 0'
  },
  selectionSubtitle: {
    fontSize: '18px',
    color: '#60AA47',
    margin: '0'
  },
  logoutButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#DC2626',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  categoriesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
    marginBottom: '32px'
  },
  categoryCard: {
    border: '2px solid #B3D29A',
    borderRadius: '16px',
    padding: '24px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    backgroundColor: 'rgba(179, 210, 154, 0.1)',
    backdropFilter: 'blur(5px)'
  },
  categoryCardCompleted: {
    borderColor: '#22C55E',
    backgroundColor: 'rgba(34, 197, 94, 0.1)'
  },
  categoryCardInProgress: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.1)'
  },
  categoryCardHeader: {
    marginBottom: '16px'
  },
  categoryCardTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#2E6603',
    marginBottom: '4px',
    margin: '0 0 4px 0'
  },
  categoryCardSubtitle: {
    fontSize: '14px',
    color: '#60AA47',
    fontStyle: 'italic',
    margin: '0 0 8px 0'
  },
  statusBadge: {
    marginTop: '8px'
  },
  statusText: {
    fontSize: '12px',
    fontWeight: '600'
  },
  categoryCardDescription: {
    fontSize: '14px',
    color: '#2E6603',
    lineHeight: '1.5',
    marginBottom: '20px',
    margin: '0 0 20px 0'
  },
  categoryCardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  questionCount: {
    fontSize: '14px',
    color: '#60AA47',
    fontWeight: '500'
  },
  totalQuestionsInfo: {
    textAlign: 'center',
    paddingTop: '24px',
    borderTop: '1px solid #B3D29A',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px'
  },
  totalQuestionsText: {
    fontSize: '16px',
    color: '#60AA47',
    margin: '0'
  },
  savingIndicator: {
    fontSize: '14px',
    color: '#F59E0B',
    fontStyle: 'italic',
    margin: '0'
  },
  centralStartButton: {
    backgroundColor: '#2E6603',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    padding: '16px 48px',
    fontSize: '18px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    boxShadow: '0 4px 12px rgba(46, 102, 3, 0.3)',
    marginTop: '8px'
  },
  loadingContainer: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #CCD8C2 0%, #B3D29A 30%, #60AA47 65%, #2E6603 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: {
    color: 'white',
    fontSize: '20px'
  },
  errorContainer: {
    color: 'white',
    textAlign: 'center',
    maxWidth: '400px'
  },
  errorTitle: {
    fontSize: '20px',
    marginBottom: '16px'
  },
  errorMessage: {
    fontSize: '14px',
    marginBottom: '16px'
  },
  retryButton: {
    backgroundColor: '#2E6603',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  mainWrapper: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'flex',
    gap: '24px',
    height: 'calc(100vh - 40px)',
    alignItems: 'stretch'
  },
  sidebar: {
    width: '380px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    flexShrink: 0
  },
  categoryInfo: {
    backgroundColor: 'rgba(46, 102, 3, 0.9)',
    color: 'white',
    padding: '24px',
    borderRadius: '16px',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
  },
  categoryTitle: {
    fontSize: '22px',
    fontWeight: 'bold',
    marginBottom: '8px',
    margin: '0 0 8px 0'
  },
  categorySubtitle: {
    color: '#B3D29A',
    fontSize: '14px',
    marginBottom: '16px',
    margin: '0 0 16px 0'
  },
  instructionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  instructionText: {
    fontSize: '13px',
    margin: '0',
    lineHeight: '1.4'
  },
  instructionBold: {
    fontWeight: '600'
  },
  progressSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(10px)',
    color: 'white',
    padding: '20px',
    borderRadius: '16px',
    flex: 1
  },
  progressTitle: {
    fontWeight: 'bold',
    marginBottom: '16px',
    margin: '0 0 16px 0',
    fontSize: '16px'
  },
  progressItem: {
    marginBottom: '16px'
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    marginBottom: '8px'
  },
  progressBarBg: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: '9999px',
    height: '6px'
  },
  progressBar: {
    height: '6px',
    borderRadius: '9999px',
    transition: 'all 0.3s ease'
  },
  categoriesContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginTop: '16px'
  },
  categoriesTitle: {
    fontWeight: '600',
    fontSize: '14px',
    margin: '0 0 8px 0'
  },
  categoryItem: {
    fontSize: '12px',
    padding: '8px 12px',
    borderRadius: '8px',
    transition: 'all 0.2s ease'
  },
  categoryItemContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  completedMark: {
    color: '#22C55E'
  },
  questionArea: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  questionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '24px',
    padding: '40px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    width: '100%',
    maxWidth: '700px',
    backdropFilter: 'blur(10px)'
  },
  questionHeader: {
    marginBottom: '32px',
    textAlign: 'center'
  },
  questionCounter: {
    color: '#60AA47',
    fontSize: '18px',
    marginBottom: '16px',
    margin: '0 0 16px 0',
    fontWeight: '600'
  },
  questionText: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#2E6603',
    marginBottom: '16px',
    margin: '0 0 16px 0',
    lineHeight: '1.3'
  },
  selectInstruction: {
    color: '#60AA47',
    marginBottom: '0',
    margin: '0',
    fontSize: '16px'
  },
  optionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '32px'
  },
  optionContainer: {
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  checkboxContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    borderRadius: '12px',
    border: '2px solid transparent',
    backgroundColor: 'rgba(179, 210, 154, 0.1)',
    transition: 'all 0.2s ease'
  },
  checkbox: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    border: '2px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    flexShrink: 0
  },
  checkmark: {
    color: 'white',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  optionText: {
    fontSize: '16px',
    color: '#2E6603',
    fontWeight: '500'
  },
  navigationContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  actionButtons: {
    display: 'flex',
    gap: '16px'
  },
  navButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    borderRadius: '25px',
    border: '2px solid',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'all 0.2s ease'
  },
  prevButton: {
    backgroundColor: 'white',
    borderColor: '#B3D29A',
    color: '#2E6603'
  },
  skipButton: {
    backgroundColor: 'white',
    borderColor: '#B3D29A',
    color: '#60AA47'
  },
  submitButton: {
    backgroundColor: '#2E6603',
    color: 'white',
    borderColor: '#2E6603'
  },
  navButtonDisabled: {
    opacity: '0.5',
    cursor: 'not-allowed'
  }
};

export default PsychologyQuestionnaire;